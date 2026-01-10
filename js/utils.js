// js/utils.js

const Utils = {
    formatMoeda: (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor),

    formatData: (data) => {
        if (!data) return '-';
        const dateObj = new Date(data);
        return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    },

    notify: {
        success: (titulo, texto) => Swal.fire({ icon: 'success', title: titulo, text: texto, confirmButtonColor: '#C5A059' }),
        error: (texto) => Swal.fire({ icon: 'error', title: 'Ops...', text: texto, confirmButtonColor: '#111111' }),
        confirm: async (titulo, texto, textoBotaoConfirmar = 'Sim') => {
            return await Swal.fire({
                title: titulo, text: texto, icon: 'warning', showCancelButton: true,
                confirmButtonColor: '#C5A059', cancelButtonColor: '#d33',
                confirmButtonText: textoBotaoConfirmar, cancelButtonText: 'Cancelar'
            });
        },
        // AQUI MUDAMOS A COR DO LOADING PARA O BORDÔ DA MARCA (#800000)
        loading: (texto = 'Processando...') => {
            Swal.fire({
                title: texto, allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                color: '#800000' 
            });
        },
        close: () => Swal.close()
    }
};